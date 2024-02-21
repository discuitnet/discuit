# Use Ubuntu as the base image to install Redis, MariaDB, and libvips
FROM ubuntu:22.04

# Avoid prompts from the package manager during build
ENV DEBIAN_FRONTEND=noninteractive

ENV GOVERSION=1.21.0

# Preconfigure tzdata package
RUN echo "Etc/UTC" > /etc/timezone && \
    ln -fs /usr/share/zoneinfo/Etc/UTC /etc/localtime && \
    apt-get update && \
    apt-get install -y --no-install-recommends tzdata

# Install dependencies
RUN apt-get update && apt-get install -y \
    mariadb-server \
    redis-server \
    curl \
    git \
    gcc \
    libvips-dev \
    musl-dev

# Install Node.js (for React frontend)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Install Go
RUN curl -LO https://go.dev/dl/go$GOVERSION.linux-amd64.tar.gz && \
    tar -C /usr/local -xzf go$GOVERSION.linux-amd64.tar.gz && \
    rm go$GOVERSION.linux-amd64.tar.gz

# Set PATH for Go
ENV PATH=$PATH:/usr/local/go/bin

WORKDIR /app

# Copy the application source code
COPY . .

# Rename config.default.yml to config.yml
RUN mv config.default.yaml config.yaml

# Build the backend
RUN GOOS=linux GOARCH=amd64 go build -o discuit .

# Build the frontend
RUN cd ui && npm ci && npm run build:prod

# Clean up
RUN apt-get remove -y curl git gcc nodejs && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy the entrypoint script to the container
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose the port the app runs on
EXPOSE 80

# Set the entrypoint script as the default command
ENTRYPOINT ["/entrypoint.sh"]
CMD ["/app/discuit", "-serve"]