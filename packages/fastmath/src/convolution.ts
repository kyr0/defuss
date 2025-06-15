export const convolution_2d = (
  image: Float32Array,
  kernel: Float32Array,
  result: Float32Array,
  imgWidth: number,
  imgHeight: number,
  kernelSize: number,
) => {
  const halfKernel = Math.floor(kernel.byteLength / 2);
  const unrollFactor = 4;

  for (let y = 0; y < imgHeight; y++) {
    for (let x = 0; x < imgWidth; x++) {
      let sum = 0;

      // Unroll the kernel computation where possible
      let kidx = 0;
      const totalKernelSize = kernelSize * kernelSize;
      const unrolledSize =
        Math.floor(totalKernelSize / unrollFactor) * unrollFactor;

      // Flattened kernel loop with unrolling
      for (; kidx < unrolledSize; kidx += unrollFactor) {
        // Manual unrolling of 4 kernel elements
        for (let u = 0; u < unrollFactor; u++) {
          const kernelIdx = kidx + u;
          const ky = Math.floor(kernelIdx / kernelSize);
          const kx = kernelIdx % kernelSize;
          const imgY = y + ky - halfKernel;
          const imgX = x + kx - halfKernel;

          if (imgY >= 0 && imgY < imgHeight && imgX >= 0 && imgX < imgWidth) {
            const imgIdx = imgY * imgWidth + imgX;
            sum += image[imgIdx] * kernel[kernelIdx];
          }
        }
      }

      // Handle remaining kernel elements
      for (; kidx < totalKernelSize; kidx++) {
        const ky = Math.floor(kidx / kernelSize);
        const kx = kidx % kernelSize;
        const imgY = y + ky - halfKernel;
        const imgX = x + kx - halfKernel;

        if (imgY >= 0 && imgY < imgHeight && imgX >= 0 && imgX < imgWidth) {
          const imgIdx = imgY * imgWidth + imgX;
          sum += image[imgIdx] * kernel[kidx];
        }
      }

      result[y * imgWidth + x] = sum;
    }
  }
};
