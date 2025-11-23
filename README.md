# Jellysterr

![License](https://img.shields.io/github/license/garnajee/Jellysterr)

A lightweight, high-performance, and secure frontend interface for Jellyfin media servers. Built with React, Vite, and TailwindCSS, this client focuses on a streamlined user experience, advanced metadata integration, and responsive design for all devices.

## Key Features

*   **Lightweight & Fast:** Optimized rendering using WebP image formats and infinite scrolling to ensure smooth performance even with large libraries.
*   **Secure Architecture:** Includes a built-in Nginx reverse proxy to securely handle external API requests (TMDB), ensuring API keys are never exposed to the client-side browser.
*   **Responsive Design:** Fully adaptive UI that works seamlessly on desktops, tablets, and mobile devices.
*   **Advanced Metadata:** Enriches Jellyfin data with TMDB information, including cast/crew details, official trailers, and streaming provider availability.
*   **Smart Filtering:** Filter content by genre, release year, and played status (Watched/Unwatched).
*   **Shuffle Mode:** Randomly select movies or series episodes with options to exclude watched content.
*   **Direct Playback:** Deep integration with Jellyfin's web player for immediate playback.

## Prerequisites

*   Docker
*   Docker Compose
*   A running Jellyfin server
*   A TMDB API Key (optional, but recommended for enhanced metadata)

## Installation & Usage

The application is designed to be deployed via Docker Compose for simplicity.

### 1. Edit `.env` file

Copy `.env.local` in `.env` and add your server url/tdb api key.

### 2. Build and Run

Run the container using Docker Compose. The `--build` flag ensures the environment variables are correctly baked into the application during the build process.

```bash
docker-compose up -d --build
```

Access the application at `http://localhost:3000`.

## Configuration

### Build Arguments (Dockerfile)

These variables are used during the build process to configure the React application.

| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_JELLYFIN_URL` | The full URL of your Jellyfin server. | Required |
| `VITE_APP_LANGUAGE` | The ISO 639-1 language code for the UI and metadata. | `fr` |

### Environment Variables (Runtime)

These variables are used by the Nginx container at runtime.

| Variable | Description | Required |
| :--- | :--- | :--- |
| `TMDB_API_KEY` | Your The Movie Database API Key for metadata fetching. | Yes |

## Development

To run the project locally without Docker for development purposes:

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the root directory:
    ```env
    VITE_JELLYFIN_URL=http://your-jellyfin-url:8096
    # Note: In dev mode, you must temporarily hardcode the API key in App.tsx 
    # or set up a local proxy, as the Nginx proxy is not active.
    ```
4.  Start the development server:
    ```bash
    npm run dev
    ```

## License

This project is under [GNU GPLv3](LICENSE) License.
