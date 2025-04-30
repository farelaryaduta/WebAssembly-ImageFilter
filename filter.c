#include <stdint.h>

void blur(uint8_t *image, int width, int height) {
  for (int y = 1; y < height - 1; y++) {
    for (int x = 1; x < width - 1; x++) {
      for (int c = 0; c < 3; c++) {
        int i = (y * width + x) * 4 + c;
        image[i] = (image[i - 4] + image[i + 4] + image[i - width * 4] + image[i + width * 4]) / 4;
      }
    }
  }
}

void invert(uint8_t *image, int length) {
  for (int i = 0; i < length; i += 4) {
    image[i] = 255 - image[i];       // R
    image[i+1] = 255 - image[i+1];   // G
    image[i+2] = 255 - image[i+2];   // B
  }
}

void sharpen(uint8_t *image, int width, int height) {
  for (int y = 1; y < height - 1; y++) {
    for (int x = 1; x < width - 1; x++) {
      for (int c = 0; c < 3; c++) {
        int i = (y * width + x) * 4 + c;
        int original = image[i];
        int neighbors = (image[i - 4] + image[i + 4] + image[i - width * 4] + image[i + width * 4]) / 4;
        int sharpened = original + (original - neighbors);
        image[i] = sharpened > 255 ? 255 : (sharpened < 0 ? 0 : sharpened);
      }
    }
  }
}
