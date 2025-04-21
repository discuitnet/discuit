{
  description = "discuit - an open-source community platform";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      nixpkgs,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            go_1_23
            nodejs_18
            mariadb
            redis
            vips
            pkg-config

            # extras
            gotools
            gopls
          ];

          shellHook = ''
            # start mariadb
            export MYSQL_UNIX_PORT=$PWD/.mysql/mysql.sock
            export MYSQL_TCP_PORT=3306

            if [ ! -d .mysql ]; then
              mkdir -p .mysql
              ${pkgs.mariadb}/bin/mysql_install_db --datadir=$PWD/.mysql
            fi

            # start mariadb in background
            ${pkgs.mariadb}/bin/mysqld --datadir=$PWD/.mysql --socket=$MYSQL_UNIX_PORT > .mysql/mysql.log 2>&1 &
            MYSQL_PID=$!

            # wait for mariadb to be ready
            echo -e "\033[1;33mWaiting for mariadb to start...\033[0m"
            for i in {1..30}; do
              if ${pkgs.mariadb}/bin/mysqladmin --socket=$MYSQL_UNIX_PORT ping &>/dev/null; then
                echo -e "\033[1;32m✓ MariaDB is ready\033[0m"
                break
              fi

              if [ $i -eq 30 ]; then
                echo -e "\033[1;31m✗ Timed out waiting for mariadb\033[0m"
                exit 1
              fi

              sleep 1
            done

            echo -e "\033[1;33m  > Configuring database and user...\033[0m"
            ${pkgs.mariadb}/bin/mysql --socket=$MYSQL_UNIX_PORT -e "CREATE DATABASE IF NOT EXISTS discuit;"
            ${pkgs.mariadb}/bin/mysql --socket=$MYSQL_UNIX_PORT -e "CREATE USER IF NOT EXISTS 'discuit'@'127.0.0.1' IDENTIFIED BY 'discuit';"
            ${pkgs.mariadb}/bin/mysql --socket=$MYSQL_UNIX_PORT -e "GRANT ALL PRIVILEGES ON discuit.* TO 'discuit'@'127.0.0.1';"
            echo -e "\033[1;32m  ✓ Database and user configured\033[0m"

            # start redis in background
            mkdir -p .redis
            ${pkgs.redis}/bin/redis-server --daemonize yes --logfile .redis/redis.log

            echo ""
            echo -e "\033[1;32m✓ Environment ready for discuit development!\033[0m"
            echo -e "\033[1;34m  • mariadb socket\033[0m : \033[0;36m$MYSQL_UNIX_PORT\033[0m"
            echo -e "\033[1;34m  • mariadb logs\033[0m   : \033[0;36m.mysql/mysql.log\033[0m"
            echo -e "\033[1;34m  • redis logs\033[0m     : \033[0;36m.redis/redis.log\033[0m"
            echo ""

            # cleanup on exit
            cleanup() {
              echo -e "\n\033[1;33mShutting down services...\033[0m"
              kill $MYSQL_PID 2>/dev/null || true
              ${pkgs.redis}/bin/redis-cli shutdown 2>/dev/null || true
            }

            trap cleanup EXIT
          '';
        };
      }
    );
}
