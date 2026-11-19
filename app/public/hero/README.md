# Full-Resolution Hero Images

Drop one or more full-resolution camera photographs into this folder (`app/public/hero/`).

### How It Works

- **Multiple Photos Supported:** You can add as many photos as you want (e.g. `ferrari.jpg`, `porsche.jpg`, `monza.jpg`, `01.jpg`, etc.).
- **Animated Sequence:** The home hero rotates through every camera master, with previous/next controls and an accessible photo counter.
- **Optical-Grade Quality:** Each photo is automatically adapted into 4K (`3840w`), 2K (`2560w`), and mobile (`1440w`) responsive variants with Lanczos downsampling and luma sharpening.
- **Git Friendly:** Your original master photos are tracked by git, while auto-generated derivatives (`*-1440.*`, `*-2560.*`, `*-3840.*`) are automatically ignored.
