package injectconfig

import (
	"fmt"

	"github.com/discuitnet/discuit/config"
	"github.com/urfave/cli/v2"
	yaml "gopkg.in/yaml.v2"
)

var Command = &cli.Command{
	Name:  "inject-config",
	Usage: "Outputs yaml with injected config",
	Action: func(ctx *cli.Context) error {
		conf := ctx.Context.Value("config").(*config.Config)

		yamlData, err := yaml.Marshal(conf)
		if err != nil {
			return fmt.Errorf("failed to marshal yaml: %w", err)
		}

		fmt.Println(string(yamlData))

		return nil
	},
}
