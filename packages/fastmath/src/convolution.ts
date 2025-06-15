// pure JavaScript implementation of convolution operations
export const convolution = (
  signal: Float32Array,
  kernel: Float32Array,
  result: Float32Array,
) => {
  const signalLen = signal.length;
  const kernelLen = kernel.length;
  const resultLen = signalLen + kernelLen - 1;

  // Unroll factor 4 for the inner kernel loop
  const unrollFactor = 4;
  const kernelLenUnrolled = Math.floor(kernelLen / unrollFactor) * unrollFactor;

  for (let n = 0; n < resultLen; n++) {
    let sum = 0;

    // Unrolled loop (factor 4)
    let m = 0;
    for (; m < kernelLenUnrolled; m += unrollFactor) {
      const baseIdx = n - m;

      // Manual unrolling of 4 iterations
      if (baseIdx >= 0 && baseIdx < signalLen)
        sum += signal[baseIdx] * kernel[m];
      if (baseIdx - 1 >= 0 && baseIdx - 1 < signalLen)
        sum += signal[baseIdx - 1] * kernel[m + 1];
      if (baseIdx - 2 >= 0 && baseIdx - 2 < signalLen)
        sum += signal[baseIdx - 2] * kernel[m + 2];
      if (baseIdx - 3 >= 0 && baseIdx - 3 < signalLen)
        sum += signal[baseIdx - 3] * kernel[m + 3];
    }

    // Handle remaining iterations
    for (; m < kernelLen; m++) {
      if (n >= m && n - m < signalLen) {
        sum += signal[n - m] * kernel[m];
      }
    }
    result[n] = sum;
  }
};

// pure JavaScript implementation of 2D convolution operations
export const convolution_2d = (
  image: Float32Array,
  kernel: Float32Array,
  result: Float32Array,
  imgWidth: number,
  imgHeight: number,
  kernelSize: number,
) => {
  const halfKernel = Math.floor(kernelSize / 2);
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
