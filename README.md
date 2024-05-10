# Discuit

This is the codebase that powers [Discuit](https://discuit.net), which is an
open-source community platform, an alternative to Reddit.

Built with:

- [Go](https://go.dev): The backend.
- [React](https://react.dev/): The frontend.
- [MariaDB](https://en.wikipedia.org/wiki/MariaDB): The main datastore.
- [Redis](https://redis.io/): For transient data.

## Getting started

### Running locally

To setup a development environment of Discuit on your local computer:

1.  Install Go (1.21 or higher) by following the instructions at
    [go.dev.](https://go.dev/doc/install)
1.  Install MariaDB, Redis, Node.js (and NPM). On Ubuntu, for instance, you might
    have to run the following commands:

    ```shell
    sudo apt update

    # Install and start MariaDB
    sudo apt install mariadb-server
    sudo systemctl start mariadb.service

    # Install and start Redis
    sudo apt install redis-server
    sudo systemctl start redis.service

    # Install Node.js and NPM
    sudo apt install nodejs npm
    ```

1.  Create a MariaDB database.

    ```shell
    # Open MariaDB CLI
    mariadb -u root -p --binary-as-hex

    # Create a database named discuit (you may use a different name)
    create database discuit;

    # Enter exit (or press Ctrl+D) to exit
    exit;
    ```

1.  Discuit uses `libvips` for fast image transformations. Make sure it's
    installed on your computer. On Ubuntu you can install it with:
    `shell
sudo apt install libvips-dev
`
1.  Clone this repository:

    ```shell
    git clone https://github.com/discuitnet/discuit.git && cd discuit
    ```

1.  Create a file named `config.yaml` in the root directory and copy the contents
    of `config.default.yaml` into it. And enter the required config parameters in
    `config.yaml`.
1.  Build the frontend and the backend:

    ```shell
    ./build.sh
    ```

1.  Run migrations:

    ```shell
    ./discuit -migrate
    ```

1.  Start the server:

    ```shell
    ./discuit -serve
    ```

After creating an account, you can run `./discuit -make-admin username` to make
a user an admin of the site.

Note: Do not install the discuit binary using go install or move it somewhere else. It uses files in this repository at runtime and so it should only be run from the root of this repository.

### Running with Docker

1. **Build the Docker Image**

   ```shell
   docker build -t discuit .
   ```

2. **Run the Docker Container**

   > **Note**: The following command while having a persistent database, the included config.yaml file is not. You will need to mount the file to the container if you want to persist the configuration.

   ```shell
   docker run -d --name discuit -v discuit-db:/var/lib/mysql -v discuit-redis:/var/lib/redis -v discuit-images:/app/images -p 8080:80 discuit
   ```

3. **Accessing Discuit**: After the container starts, you can access Discuit by navigating to `http://localhost:8080` on your web browser, or to the specific port if you customized the port mapping.

4. **Stopping the Container**: When you're done, you can stop the container by running:

   ```shell
   docker stop discuit
   ```

5. **Starting the Container Again**: To start the container again, use:

   ```shell
   docker start discuit
   ```

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

The documentation of the API can be found at [docs.discuit.net](https://docs.discuit.net).

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
