# Jellysterr

![License](https://img.shields.io/github/license/garnajee/Jellysterr)

A lightweight, high-performance, and secure frontend interface for Jellyfin media servers. Built with React, Vite, and TailwindCSS, this client focuses on a streamlined user experience, advanced metadata integration, and responsive design for all devices.

## Key Features

*   **Lightweight & Fast:** Optimized rendering using WebP image formats and infinite scrolling to ensure smooth performance even with large libraries.
*   **Secure Architecture:** Includes a built-in Nginx reverse proxy to securely handle external API requests (TMDB), ensuring API keys are never exposed to the client-side browser.
*   **Responsive Design:** Fully adaptive UI that works seamlessly on desktops, tablets, and mobile devices.
*   **Advanced Metadata:** Enriches Jellyfin data with TMDB information, including cast/crew details, official trailers, and streaming provider availability.
*   **Smart Filtering:** Filter content by genre, release year, and played status (Watched/Unwatched).
*   **Advanced Shuffle:** Randomly select a movie or series by keyword and one or more Jellyfin tags, with an option to exclude watched content.
*   **Local Performance Metrics:** Core Web Vitals are measured without external telemetry and kept in browser storage for diagnostics.
*   **Direct Playback:** Deep integration with Jellyfin's web player for immediate playback.

## Prerequisites

*   Docker
*   Docker Compose
*   A running Jellyfin server
*   A TMDB API Key (optional, but recommended for enhanced metadata)

## Installation & Usage

The application is designed to be deployed via Docker Compose for simplicity.

### 1. Create the `.env` file

```bash
cp .env.example .env
```

Set `JELLYFIN_URL`, `APP_LANGUAGE`, and `TMDB_API_KEY` in `.env`.

### 2. Build and Run

Run the container using Docker Compose:

```bash
docker-compose up -d --build
```

Access the application at `http://localhost:3000`.

## Configuration

### Build Arguments

These variables are used during the build process to configure the React application.

| Variable | Description | Default |
| :--- | :--- | :--- |
| `APP_LANGUAGE` | The ISO 639-1 language code for the UI and metadata. | `fr` |

### Environment Variables (Runtime)

These variables are used by the Nginx container at runtime.

| Variable | Description | Required |
| :--- | :--- | :--- |
| `JELLYFIN_URL` | Full URL of the Jellyfin server. | Yes |
| `TMDB_API_KEY` | The Movie Database API key used by the Nginx proxy. | Recommended |

## Development

To run the project locally without Docker for development purposes:

1. Install dependencies:

    ```bash
    npm install
    ```

2. Create the local configuration:

    ```bash
    cp .env.example .env
    ```

    Then edit `.env`:

    ```env
    JELLYFIN_URL=http://your-jellyfin-url:8096
    APP_LANGUAGE=fr
    TMDB_API_KEY=your_tmdb_api_key
    ```

    Vite proxies `/tmdb` locally, so the TMDB key is never exposed to browser code.

3. Start the development server:

    ```bash
    npm run dev
    ```

    Open `http://localhost:3000`.

4. Validate a production build when needed:

    ```bash
    npm run build
    npm run preview
    ```

    The preview is available at the URL printed by Vite (usually `http://localhost:4173`).

Core Web Vitals are logged in the browser console and stored under the `jellysterr_web_vitals` local-storage key. No metrics leave the browser.

## License

This project is under [GNU GPLv3](LICENSE) License.
