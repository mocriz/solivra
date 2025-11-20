const loadImage = (imageSrc) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image for cropping"));
    image.crossOrigin = "anonymous";
    image.src = imageSrc;
  });

export const getCroppedImageBlob = async (
  imageSrc,
  croppedAreaPixels,
  outputType = "image/jpeg",
  quality = 0.9,
) => {
  if (!imageSrc || !croppedAreaPixels) {
    throw new Error("Missing image source or crop dimensions");
  }

  const image = await loadImage(imageSrc);
  const size = Math.round(
    Math.max(croppedAreaPixels.width, croppedAreaPixels.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context is not available");
  }

  context.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    size,
    size,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to crop image"));
          return;
        }
        resolve(blob);
      },
      outputType,
      quality,
    );
  });
};

