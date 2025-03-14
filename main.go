package main

import (
	"github.com/joho/godotenv"

	"github.com/discuitnet/discuit/cli"
)

func main() {
	godotenv.Load() // Load environment variables
	cli.RunCLI()
}
