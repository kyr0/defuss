import "fslightbox";
import { createRef, $, type Props } from "defuss";

export interface PhotoGalleryProps extends Props {
  autoPlayDelayMs?: number;
}

let photos: Array<string> = [];

function setupFsLightbox(autoPlayDelayMs: number) {
  const photoCount = photos.length;
  let currentIndex = 0;

  refreshFsLightbox();
  fsLightbox.props.autoplay = true;
  fsLightbox.open(currentIndex);

  // closure based interval to change the photo every autoPlayDelayMs milliseconds
  setInterval(() => {
    currentIndex = (currentIndex + 1) % photoCount;
    fsLightbox.open(currentIndex);
  }, autoPlayDelayMs);
}

export async function PhotoGallery({
  autoPlayDelayMs = 5000,
}: PhotoGalleryProps) {
  const photosRef = createRef<string[]>();

  // load the photo descriptor JSON from public/photos.json
  $(async () => {
    const photosJson = await fetch("/photos.json");
    photos = await photosJson.json();

    // declare photos, but hide them
    $(photosRef).update(
      photos.map((photo: string, index: number) => (
        <a data-fslightbox="true" href={photo}>
          <img src={photo} alt={`${index + 1}`} style={{ display: "none" }} />
        </a>
      )),
    );

    // trigger gallery rendering
    requestAnimationFrame(() => setupFsLightbox(autoPlayDelayMs));
  });

  return <div ref={photosRef}>Loading photos...</div>;
}
