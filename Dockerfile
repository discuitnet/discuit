# syntax=docker/dockerfile:1.4

# Use official Go image for the backend build
FROM --platform=$BUILDPLATFORM golang:1.21 AS backend-builder


# FIX: docker buildx acting weird with the --platform flag
# 24.04 dpkg: error processing archive libvips42_8.7.4-1+deb10u1_arm64.deb (--install):
# 24.04  package architecture (arm64) does not match system (amd64)
# 24.05 Errors were encountered while processing:
# 24.05  libvips42_8.7.4-1+deb10u1_arm64.deb

# Install runtime dependencies (libvips)
ARG TARGETARCH
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    software-properties-common && \
    if [ "$TARGETARCH" = "arm64" ]; then \
        wget http://ftp.us.debian.org/debian/pool/main/v/vips/libvips42_8.7.4-1+deb10u1_arm64.deb && \
        dpkg -i libvips42_8.7.4-1+deb10u1_arm64.deb; \
        # wget http://ftp.us.debian.org/debian/pool/main/v/vips/libvips42_8.7.4-1+deb10u1_amd64.deb && \
        # dpkg -i libvips42_8.7.4-1+deb10u1_amd64.deb; \
    else \
        apt-get install -y libvips-dev; \
    fi && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

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
RUN go build -ldflags "-s -w" -o discuit .

# Use official Node image for the frontend build
FROM --platform=$BUILDPLATFORM node:18 AS frontend-builder

# Copy required configuration files and build files
WORKDIR /app
COPY config.default.yaml .
RUN mv config.default.yaml config.yaml
COPY --from=backend-builder /app/discuit /app/discuit

# Copy the source code and build the frontend
WORKDIR /app/ui
COPY ui/package*.json ./
RUN npm ci
COPY ui/ . 

# Final stage: setup the runtime environment
FROM node:18
# Avoid prompts from the package manager during build
ENV DEBIAN_FRONTEND=noninteractive

# Install runtime dependencies
ARG TARGETARCH
RUN apt-get update && apt-get install -y --no-install-recommends \
    mariadb-server \
    redis-server \
    wget && \
    if [ "$TARGETARCH" = "arm64" ]; then \
        wget http://ftp.us.debian.org/debian/pool/main/v/vips/libvips42_8.7.4-1+deb10u1_arm64.deb && \
        dpkg -i libvips42_8.7.4-1+deb10u1_arm64.deb; \
        # wget http://ftp.us.debian.org/debian/pool/main/v/vips/libvips42_8.7.4-1+deb10u1_amd64.deb && \
        # dpkg -i libvips42_8.7.4-1+deb10u1_amd64.deb; \
    else \
        apt-get install -y libvips-dev; \
    fi && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy built artifacts from previous stages
COPY --from=frontend-builder /app/ui /app/ui
COPY --from=backend-builder /app/discuit /app/discuit
COPY config.default.yaml /app/config.yaml
COPY migrations /app/migrations
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /app

# Setup the environment and ports
EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
CMD ["/app/discuit", "serve"]
