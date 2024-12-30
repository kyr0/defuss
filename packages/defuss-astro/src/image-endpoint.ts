import type { APIRoute } from 'astro';
import { fileTypeFromBuffer } from 'file-type';
import { createRequire } from "node:module";
export const nodeRequire = createRequire(import.meta.url);
const { convertToWebp } = nodeRequire("lightningimg-node");

export const GET: APIRoute = async ({ url }) => {

  try {
    const imgHrefRelative = url.searchParams.get('href');
    const height = url.searchParams.get('h');
    const width = url.searchParams.get('w');
    const quality = url.searchParams.get('q');

    if (!imgHrefRelative) {
      return new Response('Image URL is required', { status: 400 });
    }
    const imgHrefAbsolute = `${url.protocol}//${url.host}${imgHrefRelative}`;

    console.log('GET /_defuss/image', { imgHrefAbsolute });

    const response = await fetch(imgHrefAbsolute);
    if (!response.ok) {
      console.log('Error fetching image', { imgHrefAbsolute, response });
      return new Response('Error fetching image', { status: 500 });
    }
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    const fileExtension = (await fileTypeFromBuffer(imageBuffer))?.ext;

    if (!fileExtension) {
      console.log('Error fetching fileExtension', { fileExtension, response });
      return new Response('Error getting file extension', { status: 500 });
    }

    // if the image is already a webp, return it as is
    if (fileExtension === 'webp') {
      return new Response(imageBuffer, {
        headers: {
          'Content-Type': 'image/webp',
          'Content-Length': imageBuffer.byteLength.toString(),
        },
      });
    }

    // convert the image to webp (try to)
    let convertedImageBuffer;
    try {
      convertedImageBuffer = convertToWebp(imageBuffer, fileExtension, {
        height: height ? Number.parseInt(height) : undefined,
        width: width ? Number.parseInt(width) : undefined,
        quality: quality ? Number.parseInt(quality) : undefined,
      });

      if (!convertedImageBuffer) {
        throw new Error('Error converting image: no buffer returned');
      }
    } catch (error) {
      console.log('Error converting image', { fileExtension, bufferLength: imageBuffer.byteLength, error });
      return new Response('Error converting image', { status: 500 });
    }

    const mimeType = `image/${fileExtension}`;
    return new Response(convertedImageBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': convertedImageBuffer.length.toString(),
      },
    });

  } catch (error) {
    return new Response(`Error fetching image: ${error}`, { status: 500 });
  }
}