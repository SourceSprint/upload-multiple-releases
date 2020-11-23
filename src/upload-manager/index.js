const fs = require('fs')
const path = require('path')
const core = require('@actions/core')
const github = require('@actions/github')
const mimeTypes = require('./mime')

class CriticalError extends Error {
  constructor(message) {
    super(message)
    this.name = 'CriticalError'
  }
}
class UploadManager {
  constructor({
    tagName = '',
    releaseName = '',
    overwrite = false,
    prerelease = false,
    draft = false
  }) {
    this.tagName = tagName.replace('refs/tags/', '')
    this.releaseName = releaseName.replace('refs/tags/', '')

    this.overwrite = overwrite
    this.prerelease = prerelease
    this.draft = draft

    this.octokit = github.getOctokit(process.env.GITHUB_TOKEN)

    this.repo = github.context.repo.repo
    this.owner = github.context.repo.owner
    this.sha = github.context.sha

    this.uploadUrl = null
    this.assets = null
  }

  async resolveTag() {
    try {
      core.info('Resolving tag')

      const assets = await this.octokit.repos.listReleases({
        repo: this.repo,
        owner: this.owner
      })

      const release = assets.data.find(
        (asset) => asset.tag_name == this.tagName
      )

      if (release && !this.overwrite) {
        throw new CriticalError('Release already exists.')
      }

      if (release && this.overwrite) {
        core.info('Release exists, overwriting assets.')
        this.uploadUrl = release.upload_url

        this.assets = release.assets.map((asset) => ({
          id: asset.id,
          name: asset.name
        }))

        return
      }

      let releaseName = this.tagName.replace('v', '')

      if (this.releaseName.length) {
        releaseName = this.releaseName
      }

      core.info('Creating release.')
      const newRelease = await this.octokit.repos.createRelease({
        owner: this.owner,
        repo: this.repo,
        tag_name: this.tagName,
        name: releaseName,
        body: '',
        draft: this.draft,
        prerelease: this.prerelease,
        target_commitish: this.sha
      })

      const {
        data: { upload_url: uploadUrl }
      } = newRelease

      this.uploadUrl = uploadUrl
      this.assets = []
    } catch (e) {
      core.setFailed(e.message)
    }
  }

  async uploadAsset({ filePath, fileType }) {
    try {
      if (!this.uploadUrl) {
        throw new CriticalError('Unresolved Tag')
      }

      const name = path.basename(filePath)
      const extension = path.extname(filePath)

      const asset = this.assets.find((asset) => asset.name == name)

      if (asset) {
        // Delete asset if overwrite is enabled and asset exists
        if (!this.overwrite) {
          throw new Error(`${filePath} already exists.`)
        }

        core.info(`Overwriting ${filePath}`)

        const assetOptions = {
          owner: this.owner,
          repo: this.repo,
          asset_id: asset.id
        }

        await this.octokit.repos.deleteReleaseAsset(assetOptions)
      } else {
        core.info(`Uploading ${filePath}`)
      }

      let contentType = 'binary/octet-stream'

      if (fileType.length) {
        contentType = fileType
      } else {
        if (extension.length) {
          // Resolve mime when extension is available if available 
          const fileMime = mimeTypes.find((item) => item.extension == extension)
          if (fileMime) {
            contentType = fileMime.mime
          }
        }
      }

      const contentLength = fs.statSync(filePath).size

      const headers = {
        'content-type': contentType,
        'content-length': contentLength
      }

      const options = {
        url: this.uploadUrl,
        headers,
        name,
        data: fs.readFileSync(filePath)
      }

      // Upload release
      const response = await this.octokit.repos.uploadReleaseAsset(options)

      core.info(`Uploaded ${filePath}`)

      const {
        data: { browser_download_url: browserDownloadUrl }
      } = response

      return browserDownloadUrl
    } catch (e) {
      if (e instanceof CriticalError) {
        core.setFailed(e.message)
      } else {
        core.error(e)
      }

      return null
    }
  }
}

module.exports = {
  UploadManager
}
