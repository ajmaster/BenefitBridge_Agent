FROM node:24-bookworm-slim AS frontend-builder

WORKDIR /workspace/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS runtime

WORKDIR /app
ENV APP_ENV=cloud_run \
    HOST=0.0.0.0 \
    PORT=8080 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

COPY pyproject.toml uv.lock ./
COPY app ./app
RUN uv sync --frozen --no-dev

COPY --from=frontend-builder /workspace/frontend/out ./frontend/out

EXPOSE 8080
CMD [".venv/bin/uvicorn", "app.fast_api_app:app", "--host", "0.0.0.0", "--port", "8080"]
