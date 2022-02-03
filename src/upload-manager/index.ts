import fs from 'fs'
import path from 'path'

import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as github from '@actions/github'

import mimeTypes from './mime.json'


import { CriticalError } from './errors'


interface UploadManagerOptions {
  githubToken: string,
  tagName: string,
  releaseName: string,
  overwrite: boolean,
  prerelease: boolean,
  draft: boolean
}

interface Asset {
  id: string,
  name: string,
  tag_name?: string,
}

type Assets = Array<Asset>

interface Release {
  tag_name: string,
  upload_url: string
  assets: Assets
}

type Releases = Array<Release>


interface SelectedFile {
  filePath: string,
  fileType?: string
}


type SelectedFiles = Array<SelectedFile>


export class UploadManager {
  private tagName: string
  private releaseName: string
  private draft: boolean
  private overwrite: boolean
  private prerelease: boolean
  private octokit: any

  private repo: string
  private owner: string
  private sha: string
  private uploadUrl: string
  private assets: Assets


  constructor(options: UploadManagerOptions) {


    this.tagName = options.tagName.replace('refs/tags/', '')
    this.releaseName = options.releaseName.replace('refs/tags/', '')

    this.overwrite = options.overwrite
    this.prerelease = options.prerelease
    this.draft = options.draft

    this.octokit = github.getOctokit(options.githubToken)

    this.repo = github.context.repo.repo
    this.owner = github.context.repo.owner
    this.sha = github.context.sha

    this.uploadUrl = ''
    this.assets = []
  }

  resolveFiles = async (filelist: string) => {
    const paths = `${filelist}`.split('\n').filter((line) => line.trim().length)

    const files = paths.map(async (fileConfig: string) => {
      const [filePath, fileType] = fileConfig.split(' ')

      // Use glob to parse paths with wildcards
      if (filePath.indexOf('*') !== -1) {
        const globber = await glob.create(filePath)
        const files = await globber.glob()
        return <SelectedFiles>files.map((file) => ({
          filePath: file,
          fileType
        }))
      }

      return <SelectedFiles>[{
        filePath,
        fileType
      }]
    })

    const results = await Promise.all(files)

    return <SelectedFiles>[].concat(...results as [])
  }

  resolveTag = async () => {
    core.info('Resolving tag')

    const { data: releases } = await this.octokit.rest.repos.listReleases({
      repo: this.repo,
      owner: this.owner
    })


    const release = releases.find((release: Release) => release.tag_name == this.tagName)

    if (release && !this.overwrite) {
      throw new CriticalError('Release already exists.')
    }

    if (release && this.overwrite) {
      core.info('Release exists, overwriting assets.')
      this.uploadUrl = release.upload_url

      this.assets = release.assets.map((asset: Asset) => ({
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

    const { data: newRelease } = await this.octokit.rest.repos.createRelease({
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

  }

  uploadAsset = async (config: SelectedFile) => {
    try {

      if (!this.uploadUrl.length) {
        throw new CriticalError('Unresolved Tag')
      }

      const {
        filePath,
        fileType = 'binary/octet-stream'
      } = config


      const name = path.basename(filePath)
      const extension = path.extname(filePath)

      const asset = this.assets.find((asset) => asset.name === name)

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

        await this.octokit.rest.repos.deleteReleaseAsset(assetOptions)

      } else {
        core.info(`Uploading ${filePath}`)
      }

      let contentType = fileType

      if (extension.length) {
        // Resolve mime when extension is available if available 
        const fileMime = mimeTypes.find((item) => item.extension == extension)

        if (fileMime) {
          contentType = fileMime.mime
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
      await this.octokit.rest.repos.uploadReleaseAsset(options)

      core.info(`Uploaded ${filePath}`)


    } catch (e: any) {

      switch (true) {
        case e instanceof CriticalError: {
          throw e
        }

        default: {
          core.warning(e.message || e)
          break;
        }
      }
    }
  }
}
