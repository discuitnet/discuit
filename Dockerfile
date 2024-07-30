# Use official Go image for the backend build
FROM --platform="$TARGETOS/$TARGETARCH" golang:1.21 AS backend-builder

# Set the environment variables for the build
ARG TARGETOS
ARG TARGETARCH
ENV GOOS=$TARGETOS
ENV GOARCH=$TARGETARCH

# Copy the source code and build the backend
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . .
RUN apt-get update && apt-get install -y wget software-properties-common libvips-dev libvips42
RUN go build -ldflags "-s -w" -o discuit .

# Use official Node image for the frontend build
FROM --platform="$TARGETOS/$TARGETARCH" node:18 AS frontend-builder

# Copy required configuration files and build files
WORKDIR /app
COPY config.default.yaml .
RUN mv config.default.yaml config.yaml

# Copy the source code and build the frontend
WORKDIR /app/ui
COPY ui/package*.json ./
RUN npm ci
COPY ui/ . 

# Final stage: setup the runtime environment
FROM --platform="$TARGETOS/$TARGETARCH" node:18-bookworm
ENV DEBIAN_FRONTEND=noninteractive

# Copy built artifacts from previous stages
COPY --from=frontend-builder /app/ui /app/ui
COPY --from=backend-builder /app/discuit /app/discuit
COPY config.default.yaml /app/config.yaml
COPY migrations /app/migrations
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN apt-get update && apt-get install -y \
    mariadb-server \
    redis-server \
    wget && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Setup the environment and ports
EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
CMD ["/app/discuit", "serve"]
