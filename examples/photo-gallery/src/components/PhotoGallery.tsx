import { createRef, $, createStore, type Props } from "defuss";

export interface PhotoGalleryProps extends Props {
  autoPlayDelayMs?: number;
}

const store = createStore({
  photos: [] as Array<string>,
  currentIndex: 0,
});

export function PhotoGallery({ autoPlayDelayMs = 5000 }: PhotoGalleryProps) {
  const galleryRef = createRef<HTMLDivElement>();

  const onMount = async () => {
    const photosJson = await fetch("/photos.json");
    const photosList: Array<string> = await photosJson.json();

    console.log("PhotoGallery component initialized with photos:", photosList);

    store.set({ photos: photosList, currentIndex: 0 });

    // Auto-advance slides
    setInterval(() => {
      const { photos, currentIndex } = store.value;
      if (!photos || photos.length === 0) return;
      store.set("currentIndex", (currentIndex + 1) % photos.length);
    }, autoPlayDelayMs);

    // Keyboard navigation
    const handleKeydown = (e: KeyboardEvent) => {
      const { photos, currentIndex } = store.value;
      if (!photos || photos.length === 0) return;
      if (e.key === "ArrowLeft") {
        store.set("currentIndex",
          (currentIndex - 1 + photos.length) % photos.length,
        );
      } else if (e.key === "ArrowRight") {
        store.set("currentIndex",
          (currentIndex + 1) % photos.length,
        );
      }
    };

    document.addEventListener("keydown", handleKeydown);

    // Re-render first slide
    renderSlide();
  };

  const renderSlide = () => {
    const { photos, currentIndex } = store.value;
    if (!photos || photos.length === 0) return;

    $(galleryRef).update(
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={photos[currentIndex]}
          alt={`Slide ${currentIndex + 1}`}
          style={{
            maxWidth: "100vw",
            maxHeight: "100vh",
            objectFit: "contain",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.5)",
            color: "#fff",
            padding: "4px 12px",
            borderRadius: "8px",
            fontSize: "14px",
            fontFamily: "sans-serif",
            userSelect: "none",
          }}
        >
          {currentIndex + 1} / {photos.length}
        </div>
        <button
          type="button"
          onClick={() => {
            const { photos, currentIndex } = store.value;
            if (!photos || photos.length === 0) return;
            store.set("currentIndex",
              (currentIndex - 1 + photos.length) % photos.length,
            );
          }}
          style={{
            position: "absolute",
            left: "16px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "rgba(0,0,0,0.4)",
            color: "#fff",
            border: "none",
            fontSize: "32px",
            cursor: "pointer",
            padding: "8px 12px",
            borderRadius: "8px",
          }}
        >
          &#8249;
        </button>
        <button
          type="button"
          onClick={() => {
            const { photos, currentIndex } = store.value;
            if (!photos || photos.length === 0) return;
            store.set("currentIndex",
              (currentIndex + 1) % photos.length,
            );
          }}
          style={{
            position: "absolute",
            right: "16px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "rgba(0,0,0,0.4)",
            color: "#fff",
            border: "none",
            fontSize: "32px",
            cursor: "pointer",
            padding: "8px 12px",
            borderRadius: "8px",
          }}
        >
          &#8250;
        </button>
      </div>,
    );
  };

  store.subscribe(renderSlide);

  return (
    <div
      ref={galleryRef}
      onMount={onMount}
      class="photo-gallery"
      style={{
        height: "100vh",
        width: "100vw",
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      Loading photos...
    </div>
  );
}
