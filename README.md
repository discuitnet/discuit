# Discuit

This is the codebase that powers [Discuit](https://discuit.org), which is an
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
1.  Install MariaDB (11.3 or higher), Redis, Node.js (and NPM). On Ubuntu, for
    instance, you might have to run the following commands:

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
    
    ```shell
    `sudo apt install libvips-dev`.
    ```
    
1.  Clone this repository:

    ```shell
    git clone https://github.com/SienaSoftwareEngineering/discuit.git && cd discuit
    ```

1.  Create a file named `config.yaml` in the root directory and copy the contents
    of `config.default.yaml` into it. And enter the required config parameters in
    `config.yaml`.
    
    ```shell
    cp config.default.yaml config.yaml
    ```

1.  Build the frontend and the backend:

    ```shell
    ./build.sh
    ```

1.  Run migrations:

    ```shell
    ./discuit migrate run
    ```

1.  Start the server:

    ```shell
    ./discuit serve
    ```

1.  In order to edit within your VM and make sure you're in the right place open the file with:

    ```shell
    code .
    ```

After creating an account, you can run `./discuit admin make username` to make
a user an admin of the site.

Note: Do not install the discuit binary using `go install` or move it somewhere else. It uses files in this repository at runtime and so it should only be run from the root of this repository.


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
