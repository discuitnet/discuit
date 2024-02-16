# Discuit

This is the codebase that powers [Discuit](https://discuit.net), which is an
open-source community platform, an alternative to Reddit.

Built with:

- [Go](https://go.dev): The backend.
- [React](https://react.dev/): The frontend.
- [MariaDB](https://en.wikipedia.org/wiki/MariaDB): The main datastore.
- [Redis](https://redis.io/): For transient data.

## Getting started

Ensure that Go, Node.js, npm and [libvips](https://github.com/libvips/libvips) are installed on your system.

If not already, follow these instructions:

- Install Go: Follow the instructions provided at [go.dev.](https://go.dev/doc/install).
- Install Node.js and npm: On Ubuntu for instance, you can install them with the following command: `sudo apt install nodejs npm`.
- Install `libvips`: Discuit uses libvips for fast image transformations.
  On Ubuntu, you can install libvips development files using the following command: `sudo apt install libvips-dev`.

### Setup external services

#### With Docker Compose

- Clone the repository.
- Make sure you have [Docker Compose installed](https://docs.docker.com/compose/install/).
- Run the following command to start the services:
  `docker compose up` (or `docker-compose up` if running [Compose V1](https://docs.docker.com/compose/migrate/)).

#### Without Docker Compose

- Install [MariaDB](https://mariadb.com/kb/en/getting-installing-and-upgrading-mariadb/) and [Redis](https://redis.io/docs/install/install-redis/).
  On Ubuntu, for instance, you can install them by running the following commands:

  ```shell
  sudo apt update

  # Install and start MariaDB
  sudo apt install mariadb-server
  sudo systemctl start mariadb.service

  # Install and start Redis
  sudo apt install redis-server
  sudo systemctl start redis.service
  ```

- Create a MariaDB database

  ```shell
  # Open MariaDB CLI (there is no password by default, just press Enter)
  sudo mariadb -u root -p --binary-as-hex

  # Create a database named discuit (you may use a different name)
  create database discuit;

  # Set the root password (you can replace 'password' by something more robust if you want)
  ALTER USER 'root'@'localhost' IDENTIFIED BY 'password';

  # Enter exit (or press Ctrl+D) to exit
  exit;
  ```

### Build and run Discuit

1. **Clone the repository** if not already done.

2. **Create configuration file:** Copy `config.default.yaml` and rename it to `config.yaml`.
   Adjust parameters in `config.yaml` if needed (review required parameters).

3. **Build Discuit**, the frontend and the backend:

   ```shell
   ./build.sh
   ```

4. **Run migrations:**

   ```shell
   ./discuit -migrate
   ```

5. **Start the server:**

   ```shell
   ./discuit -serve
   ```

6. **Access Discuit:** Open [http://localhost:8080](http://localhost:8080) in your browser.

7. **Create an account**

8. **(Optional) Grant admin privileges:** You can run `./discuit -make-admin <username>` to make a user an admin of the site.

**Note:** Do not install the `discuit` binary using `go install` or move it somewhere
else. It uses files in this repository at runtime and so it should only be run
from the root of this repository.

### Source code layout

In the root directory are these directories:

- `core`: Contains all the core functionality of the backend.
- `internal`: Contains Go packages internal to the project.
- `migrations`: Contains the SQL migration files.
- `server`: Contains the REST API backend.
- `ui` - Contains the React frontend.

## Contributing

Discuit is free and open-source software, and you're welcome to contribute to
its development.

If you're thinking of working on something substantial, however, (like a major
feature) please create an issue, or contact [the
maintainer](https://discuit.net/@previnder), to discuss it before commencing
work.

## License

Copyright (C) 2024 Previnder

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along
with this program. If not, see <https://www.gnu.org/licenses/>.
