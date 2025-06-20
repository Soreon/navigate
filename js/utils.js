// function that returns a promise that resolves when the image is loaded of if the image is already loaded
export function loadImage(image) {
  return new Promise((resolve, reject) => {
    if (image.complete) {
      resolve(image);
    } else {
      image.addEventListener('load', () => {
        resolve(image);
      });
      image.addEventListener('error', (event) => {
        reject(event);
      });
    }
  });
}