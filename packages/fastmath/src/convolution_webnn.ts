// convolution using the WebNN API
export const convolution_2d = (
  image: Float32Array,
  kernel: Float32Array,
  result: Float32Array,
  imgWidth: number,
  imgHeight: number,
  kernelSize: number,
) => {
  /* some demo code -- the pipeline should be reused!!
// 1. feature-check & context
  if (!navigator.ml) throw new Error('WebNN not enabled');
  const context  = await navigator.ml.createContext();   // GPU/NPU picked by UA

  // 2. graph builder ----------------------------------------------------------
  const builder  = new MLGraphBuilder(context);

  // NCHW input  : 1 × 3 × 32 × 32
  const xDesc    = {type: 'float32', dimensions: [1, 3, 32, 32]};
  const x        = builder.input('x', xDesc);

  // OIHW kernel : 16 × 3 × 3 × 3  (16 out-ch, 3 in-ch, 3×3 kernel)
  const wDesc    = {type: 'float32', dimensions: [16, 3, 3, 3]};
  const wData    = new Float32Array(16*3*3*3).fill(0.05);   // toy weights
  const w        = builder.constant(wDesc, wData);

  // 3. conv2d -----------------------------------------------------------------
  const y        = builder.conv2d(
      x, w,
      {
        padding: [1,1,1,1],           // keep spatial size
        strides: [1,1],
        inputLayout : 'nchw',
        filterLayout: 'oihw'
      });                              // spec §7.9.10 conv2d :contentReference[oaicite:0]{index=0}

  // 4. compile & run ----------------------------------------------------------
  const graph    = await builder.build({y});
  const xBuf     = new Float32Array(xDesc.dimensions.reduce((a,b)=>a*b)).fill(1);
  const yBuf     = new Float32Array(1*16*32*32);

  await graph.compute({x: xBuf}, {y: yBuf});
  console.log('First 10 outputs:', yBuf.slice(0,10));

  */
};
