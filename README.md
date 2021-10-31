# Upload Multiple Releases

This Action uploads multiple assets from your build directory to Github Releases

## Example 

This is an example tailored for uploaded assets for a compiled NodeJS application.

```yml


on:
  push:
    # Sequence of patterns matched against refs/tags
    tags:
      - "v*" # Push events to matching v*, i.e. v1.0, v20.15.10

name: Upload Release Asset

jobs:
  build:
    name: Upload Release Asset
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Build project
        run: |
          npm install
          npm run compile

      - name: "Fetch tags"
        id: fetch-tags
        uses: actions/github-script@v2
        with:
          script: |
            return require(`${process.env.GITHUB_WORKSPACE}/package.json`).version
          result-encoding: string

      - name: Upload release binaries
        uses: boxpositron/upload-multiple-releases@1.0.6
        env:
          GITHUB_TOKEN: ${{ secrets.RELEASE_TOKEN }}
        with:
          release_config: |
            lib/*macos
            lib/*linux
            lib/*.exe
            lib/*.yml
            lib/*.zip
          tag_name: v${{ steps.fetch-tags.outputs.result }}
          release_name: ${{ steps.fetch-tags.outputs.result }}
          draft: false
          prerelease: false
          overwrite: true

```