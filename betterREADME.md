# INSTALL GO
wget https://go.dev/dl/go1.21.1.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.1.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
go version

# INSTALL MARIADB
sudo apt update
sudo apt install -y mariadb-server
sudo service mariadb start
sudo service mariadb status

# INSTALL REDIS
sudo apt install -y redis-server
sudo service redis-server start
sudo service redis-server status

# INSTALL NODE.JS & NPM
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v

# INSTALL LIBVIPS (image processing)
sudo apt install -y libvips-dev

# CREATE MARIADB DATABASE & USER
sudo mariadb
	then in the prompt,
⦁	CREATE DATABASE IF NOT EXISTS discuit;
⦁	CREATE USER IF NOT EXISTS 'discuit'@'localhost' IDENTIFIED BY 'discuit';
⦁	GRANT ALL PRIVILEGES ON discuit.* TO 'discuit'@'localhost';
⦁	FLUSH PRIVILEGES;
⦁	EXIT;

# CLONE REPO
cd ~
git clone your-discuit-fork-link
cd name-of-your-fork

# CREATE AND EDIT CONFIG YAML
cp config.default.yaml config.yaml
code config.yaml
	Paste these settings into it:
⦁	siteName: Discuit
⦁	siteDescription: A free and open-source community platform.
⦁	emailContact: ""
⦁	twitterURL: ""
⦁	discordURL: ""
⦁	githubURL: "https://github.com/discuitnet/discuit"
⦁	substackURL: ""
⦁	
⦁	isDevelopment: true
⦁	hmacSecret: "e4f7b2d9c6a3f1e8b5d0c9a7f6e3d2b1c8a9f0e7d4c3b2a1f6e9d8c7b5a4f3e2"
⦁	noLogToFile: false
⦁	csrfOff: false
⦁	
⦁	addr: :8080
⦁	sessionCookieName: SID
⦁	
⦁	dbAddr: 127.0.0.1
⦁	dbUser: discuit
⦁	dbPassword: discuit
⦁	dbName: discuit
⦁	
⦁	captchaSecret: ""
⦁	captchaSiteKey: ""
⦁	disableRateLimits: false
⦁	
⦁	certFile: ""
⦁	keyFile: ""
⦁	
⦁	defaultFeedSort: hot
⦁	disableForumCreation: true
⦁	forumCreationReqPoints: 10
⦁	maxForumsPerUser: 10
⦁	imagesFolderPath: "images"

	Save the file.

# BUILD DISCUIT
chmod +x build.sh
./build.sh

# RUN DATABASE
./discuit migrate run

# START SERVER
./discuit serve
Open your http://localhost:8080
You can make yourself admin after creating an account with ./discuit admin make yourusername

