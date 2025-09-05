import { createRef } from "defuss";

interface ShaderOptions {
	[key: string]: unknown;
}

interface UniformData {
	type: string;
	value: number | number[] | Float32Array;
	location?: WebGLUniformLocation | null;
}

interface BufferData {
	size: number;
	data: number[];
	buffer?: WebGLBuffer | null;
}

interface CameraConfig {
	fov: number;
	near: number;
	far: number;
	aspect: number;
	z: number;
	perspective: boolean;
}

class ShaderProgram {
	gl!: WebGLRenderingContext;
	canvas!: HTMLCanvasElement;
	camera: CameraConfig;
	holder!: HTMLElement;
	onUpdate: ((delta: number) => void) | undefined;
	onResize: ((width: number, height: number, dpi: number) => void) | undefined;
	data: {
		uniforms: Record<string, UniformData>;
		buffers: Record<string, BufferData>;
	} = {
		uniforms: {},
		buffers: {},
	};
	count = 0;
	width = 0;
	height = 0;
	aspect = 0;
	dpi = 0;
	uniforms: Record<string, number | number[] | Float32Array> = {};
	buffers: Record<string, number[]> = {};
	program: WebGLProgram | null = null;
	texture: WebGLTexture | null = null;
	time: { start: number; old: number } | undefined;

	constructor(holder: HTMLElement, options: ShaderOptions = {}) {
		const mergedOptions = Object.assign(
			{
				antialias: false,
				depthTest: false,
				mousemove: false,
				autosize: true,
				side: "front",
				vertex: `
        precision highp float;

        attribute vec4 a_position;
        attribute vec4 a_color;

        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mousemove;
        uniform mat4 u_projection;

        varying vec4 v_color;

        void main() {

          gl_Position = u_projection * a_position;
          gl_PointSize = (10.0 / gl_Position.w) * 100.0;

          v_color = a_color;

        }`,
				fragment: `
        precision highp float;

        uniform sampler2D u_texture;
        uniform int u_hasTexture;

        varying vec4 v_color;

        void main() {

          if ( u_hasTexture == 1 ) {

            gl_FragColor = v_color * texture2D(u_texture, gl_PointCoord);

          } else {

            gl_FragColor = v_color;

          }

        }`,
				uniforms: {},
				buffers: {},
				camera: {},
				texture: null,
				onUpdate: () => {},
				onResize: () => {},
			},
			options,
		);

		const uniforms = Object.assign(
			{
				time: {
					type: "float",
					value: 0,
				},
				hasTexture: {
					type: "int",
					value: 0,
				},
				resolution: {
					type: "vec2",
					value: [0, 0],
				},
				mousemove: {
					type: "vec2",
					value: [0, 0],
				},
				projection: {
					type: "mat4",
					value: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
				},
			},
			mergedOptions.uniforms,
		);

		const buffers = Object.assign(
			{
				position: {
					size: 3,
					data: [],
				},
				color: {
					size: 4,
					data: [],
				},
			},
			mergedOptions.buffers,
		);

		const camera = Object.assign(
			{
				fov: 60,
				near: 1,
				far: 10000,
				aspect: 1,
				z: 100,
				perspective: true,
			},
			mergedOptions.camera,
		);

		const canvas = document.createElement("canvas");
		const gl = canvas.getContext("webgl", {
			antialias: mergedOptions.antialias,
		}) as WebGLRenderingContext;

		if (!gl) throw new Error("WebGL not supported");

		this.count = 0;
		this.gl = gl;
		this.canvas = canvas;
		this.camera = camera;
		this.holder = holder;
		this.onUpdate = mergedOptions.onUpdate;
		this.onResize = mergedOptions.onResize;

		holder.appendChild(canvas);

		this.createProgram(mergedOptions.vertex, mergedOptions.fragment);

		this.createBuffers(buffers);
		this.createUniforms(uniforms);

		this.updateBuffers();
		this.updateUniforms();

		this.createTexture(mergedOptions.texture);

		gl.enable(gl.BLEND);
		gl.enable(gl.CULL_FACE);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
		gl[mergedOptions.depthTest ? "enable" : "disable"](gl.DEPTH_TEST);

		if (mergedOptions.autosize)
			window.addEventListener("resize", (e) => this.resize(e), false);
		if (mergedOptions.mousemove)
			window.addEventListener("mousemove", (e) => this.mousemove(e), false);

		this.resize(undefined);

		this.update = this.update.bind(this);
		this.time = {
			start: performance.now(),
			old: performance.now(),
		};
		this.update();
	}

	mousemove(e: MouseEvent) {
		const x = (e.pageX / this.width) * 2 - 1;
		const y = (e.pageY / this.height) * 2 - 1;

		this.uniforms.mousemove = [x, y];
	}

	resize(e: Event | undefined) {
		const holder = this.holder;
		const canvas = this.canvas;
		const gl = this.gl;

		this.width = holder.offsetWidth;
		this.height = holder.offsetHeight;
		this.aspect = this.width / this.height;
		this.dpi = devicePixelRatio;

		const width = this.width;
		const height = this.height;
		const aspect = this.aspect;
		const dpi = this.dpi;

		canvas.width = width * dpi;
		canvas.height = height * dpi;
		canvas.style.width = "100%";
		canvas.style.height = "100%";

		gl.viewport(0, 0, width * dpi, height * dpi);
		gl.clearColor(0, 0, 0, 0);

		this.uniforms.resolution = [width, height];
		this.uniforms.projection = this.setProjection(aspect);

		this.onResize(width, height, dpi);
	}

	setProjection(aspect) {
		const camera = this.camera;

		if (camera.perspective) {
			camera.aspect = aspect;

			const fovRad = camera.fov * (Math.PI / 180);
			const f = Math.tan(Math.PI * 0.5 - 0.5 * fovRad);
			const rangeInv = 1.0 / (camera.near - camera.far);

			const matrix = [
				f / camera.aspect,
				0,
				0,
				0,
				0,
				f,
				0,
				0,
				0,
				0,
				(camera.near + camera.far) * rangeInv,
				-1,
				0,
				0,
				camera.near * camera.far * rangeInv * 2,
				0,
			];

			matrix[14] += camera.z;
			matrix[15] += camera.z;

			return matrix;
		}
		return [
			2 / this.width,
			0,
			0,
			0,
			0,
			-2 / this.height,
			0,
			0,
			0,
			0,
			1,
			0,
			-1,
			1,
			0,
			1,
		];
	}

	createShader(type, source) {
		const gl = this.gl;
		const shader = gl.createShader(type);

		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			return shader;
		}
		console.log(gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
	}

	createProgram(vertex, fragment) {
		const gl = this.gl;

		const vertexShader = this.createShader(gl.VERTEX_SHADER, vertex);
		const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragment);

		const program = gl.createProgram();

		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
			gl.useProgram(program);
			this.program = program;
		} else {
			console.log(gl.getProgramInfoLog(program));
			gl.deleteProgram(program);
		}
	}

	createUniforms(data) {
		const gl = this.gl;
		this.data.uniforms = data;
		const uniforms = this.data.uniforms;
		this.uniforms = {};
		const values = this.uniforms;

		for (const name of Object.keys(uniforms)) {
			const uniform = uniforms[name];

			uniform.location = gl.getUniformLocation(this.program, `u_${name}`);

			Object.defineProperty(values, name, {
				set: (value) => {
					uniforms[name].value = value;
					this.setUniform(name, value);
				},
				get: () => uniforms[name].value,
			});
		}
	}

	setUniform(name, value) {
		const gl = this.gl;
		const uniform = this.data.uniforms[name];

		uniform.value = value;

		switch (uniform.type) {
			case "int": {
				gl.uniform1i(uniform.location, value);
				break;
			}
			case "float": {
				gl.uniform1f(uniform.location, value);
				break;
			}
			case "vec2": {
				gl.uniform2f(
					uniform.location,
					(value as number[])[0],
					(value as number[])[1],
				);
				break;
			}
			case "vec3": {
				gl.uniform3f(
					uniform.location,
					(value as number[])[0],
					(value as number[])[1],
					(value as number[])[2],
				);
				break;
			}
			case "vec4": {
				gl.uniform4f(
					uniform.location,
					(value as number[])[0],
					(value as number[])[1],
					(value as number[])[2],
					(value as number[])[3],
				);
				break;
			}
			case "mat2": {
				gl.uniformMatrix2fv(uniform.location, false, value);
				break;
			}
			case "mat3": {
				gl.uniformMatrix3fv(uniform.location, false, value);
				break;
			}
			case "mat4": {
				gl.uniformMatrix4fv(uniform.location, false, value);
				break;
			}
		}

		// ivec2       : uniform2i,
		// ivec3       : uniform3i,
		// ivec4       : uniform4i,
		// sampler2D   : uniform1i,
		// samplerCube : uniform1i,
		// bool        : uniform1i,
		// bvec2       : uniform2i,
		// bvec3       : uniform3i,
		// bvec4       : uniform4i,
	}

	updateUniforms() {
		const gl = this.gl;
		const uniforms = this.data.uniforms;

		for (const name of Object.keys(uniforms)) {
			const uniform = uniforms[name];

			this.uniforms[name] = uniform.value;
		}
	}

	createBuffers(data) {
		const gl = this.gl;
		this.data.buffers = data;
		const buffers = this.data.buffers;
		this.buffers = {};
		const values = this.buffers;

		for (const name of Object.keys(buffers)) {
			const buffer = buffers[name];

			buffer.buffer = this.createBuffer(`a_${name}`, buffer.size);

			Object.defineProperty(values, name, {
				set: (data) => {
					buffers[name].data = data;
					this.setBuffer(name, data);

					if (name === "position")
						this.count = buffers.position.data.length / 3;
				},
				get: () => buffers[name].data,
			});
		}
	}

	createBuffer(name, size) {
		const gl = this.gl;
		const program = this.program;

		const index = gl.getAttribLocation(program, name);
		const buffer = gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.enableVertexAttribArray(index);
		gl.vertexAttribPointer(index, size, gl.FLOAT, false, 0, 0);

		return buffer;
	}

	setBuffer(name: string | null, data?: number[]) {
		const gl = this.gl;
		const buffers = this.data.buffers;

		if (name == null) {
			gl.bindBuffer(gl.ARRAY_BUFFER, null);
			return;
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, buffers[name].buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
	}

	updateBuffers() {
		const gl = this.gl;
		const buffers = this.buffers;

		for (const name of Object.keys(buffers)) {
			buffers[name] = this.data.buffers[name].data;
		}

		this.setBuffer(null);
	}

	createTexture(src) {
		const gl = this.gl;
		const texture = gl.createTexture();

		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			1,
			1,
			0,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			new Uint8Array([0, 0, 0, 0]),
		);

		this.texture = texture;

		if (src) {
			this.uniforms.hasTexture = 1;
			this.loadTexture(src);
		}
	}

	loadTexture(src) {
		const gl = this.gl;
		const texture = this.texture;

		const textureImage = new Image();

		textureImage.onload = () => {
			gl.bindTexture(gl.TEXTURE_2D, texture);

			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.RGBA,
				gl.RGBA,
				gl.UNSIGNED_BYTE,
				textureImage,
			);

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			// gl.generateMipmap( gl.TEXTURE_2D )
		};

		textureImage.src = src;
	}

	update() {
		const gl = this.gl;

		const now = performance.now();
		const elapsed = (now - this.time.start) / 5000;
		const delta = now - this.time.old;
		this.time.old = now;

		this.uniforms.time = elapsed;

		if (this.count > 0) {
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.drawArrays(gl.POINTS, 0, this.count);
		}

		this.onUpdate(delta);

		requestAnimationFrame(this.update);
	}
}

export function WavesBackground() {
	const wavesRef = createRef();

	const onMount = () => {
		const pointSize = 2.5;

		const waves = new ShaderProgram(wavesRef.current, {
			texture:
				"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAb1BMVEUAAAD///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8v0wLRAAAAJHRSTlMAC/goGvDhmwcExrVjWzrm29TRqqSKenRXVklANSIUE8mRkGpv+HOfAAABCElEQVQ4y4VT13LDMAwLrUHteO+R9f/fWMfO6dLaPeKVEECRxOULWsEGpS9nULDwia2Y+ALqUNbAWeg775zv+sA4/FFRMxt8U2FZFCVWjR/YrH4/H9sarclSKdPMWKzb8VsEeHB3m0shkhVCyNzeXeAQ9Xl4opEieX2QCGnwGbj6GMyjw9t1K0fK9YZunPXeAGsfJtYjwzxaBnozGGorYz0ypK2HzQSYx1y8DgSRo2ewOiyh2QWOEk1Y9OrQV0a8TiBM1a8eMHWYnRMy7CZ4t1CmyRkhSUvP3gRXyHOCLBxNoC3IJv//ZrJ/kxxUHPUB+6jJZZHrpg6GOjnqaOmzp4NDR48OLxn/H27SRQ08S0ZJAAAAAElFTkSuQmCC",
			uniforms: {
				size: { type: "float", value: pointSize },
				field: { type: "vec3", value: [0, 0, 0] },
				speed: { type: "float", value: 5 },
			},
			vertex: `
    #define M_PI 3.1415926535897932384626433832795

    precision highp float;

    attribute vec4 a_position;
    attribute vec4 a_color;

    uniform float u_time;
    uniform float u_size;
    uniform float u_speed;
    uniform vec3 u_field;
    uniform mat4 u_projection;

    varying vec4 v_color;

    void main() {

      vec3 pos = a_position.xyz;

      pos.y += (
        cos(pos.x / u_field.x * M_PI * 8.0 + u_time * u_speed) +
        sin(pos.z / u_field.z * M_PI * 8.0 + u_time * u_speed)
      ) * u_field.y;

      gl_Position = u_projection * vec4( pos.xyz, a_position.w );
      gl_PointSize = ( u_size / gl_Position.w ) * 100.0;

      v_color = a_color;

    }`,
			fragment: `
    precision highp float;

    uniform sampler2D u_texture;

    varying vec4 v_color;

    void main() {

      gl_FragColor = v_color * texture2D(u_texture, gl_PointCoord);

    }`,
			onResize(w, h, dpi) {
				const position = [];
				const color = [];

				const width = 400 * (w / h);
				const depth = 400;
				const height = 3;
				const distance = 5;

				for (let x = 0; x < width; x += distance) {
					for (let z = 0; z < depth; z += distance) {
						position.push(-width / 2 + x, -30, -depth / 2 + z);
						color.push(
							0,
							1 - (x / width) * 1,
							0.5 + (x / width) * 0.5,
							z / depth,
						);
					}
				}

				this.uniforms.field = [width, height, depth];

				this.buffers.position = position;
				this.buffers.color = color;

				this.uniforms.size = (h / 400) * pointSize * dpi;
			},
		});
	};

	return <div onMount={onMount} ref={wavesRef} class="waves" />;
}
