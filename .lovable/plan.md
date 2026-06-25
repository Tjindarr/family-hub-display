## Goal
Eliminate the visible load delay when the PhotoWidget transitions to the next image on slower hardware (Raspberry Pi) by preloading upcoming images in the background.

## Approach
Update `src/components/PhotoWidget.tsx` only — this is a presentation-layer change, no config or backend work.

### 1. Preload the next image (and the one after)
Add an effect that, whenever `currentIndex` or `photos` changes, creates off-DOM `Image()` objects for the next 1–2 photos in the rotation:

```ts
useEffect(() => {
  if (photos.length <= 1) return;
  const nextIdxs = [1, 2].map(o => (currentIndex + o) % photos.length);
  nextIdxs.forEach(i => {
    const img = new Image();
    img.decoding = "async";
    img.src = photos[i].url;
  });
}, [currentIndex, photos]);
```

The browser caches the fetched bytes, so when `advance()` swaps to that image it renders from cache instantly.

### 2. Decode before swap (optional polish)
Before triggering the transition in `advance()`, `await` `img.decode()` on the next photo so the bitmap is fully ready (avoids a paint stall on Pi):

```ts
const next = (currentIndex + 1) % photos.length;
const pre = new Image();
pre.src = photos[next].url;
try { await pre.decode(); } catch {}
// then setAnimating(true), setPrevIndex, setCurrentIndex...
```

This makes `advance` async; the interval callback wraps it in a fire-and-forget call.

### 3. Also warm the first image on mount
Right after `setPhotos(...)`, preload index 1 so the very first transition is smooth too (handled naturally by the effect in step 1, since it runs on `photos` change).

## Out of scope
- No changes to server-side photo delivery, thumbnails, or formats.
- No changes to PhotoManager, transitions list, or config schema.
- Demo photos use Unsplash URLs — they get the same preload treatment for free.

## Files touched
- `src/components/PhotoWidget.tsx`
