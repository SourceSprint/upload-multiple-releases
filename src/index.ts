import core from '@actions/core'

import {
  UploadManager
} from './upload-manager'

import { githubToken } from './config/constants'

const run = async () => {
  try {
    // Get inputs from workflow file
    const releaseConfig = core.getInput('release_config', {
      required: true
    })

    const tagName = core.getInput('tag_name', {
      required: true
    })

    const releaseName = core.getInput('release_name', {
      required: false
    })

    const overwrite = core.getInput('overwrite', {
      required: false
    }) === 'true'

    const draft = core.getInput('draft', {
      required: false
    }) === 'true'


    const prerelease =
      core.getInput('prerelease', {
        required: false
      }) === 'true'


    const options = {
      draft,
      tagName,
      overwrite,
      prerelease,
      releaseName,
      githubToken,
    }

    const manager = new UploadManager(options)

    const filelist = await manager.resolveFiles(releaseConfig)

    core.info(`Found ${filelist.length} asset(s)`)
    core.info(filelist.map((file) => file.filePath).join('\n'))


    const urls = []

    await manager.resolveTag()

    for (let fileConfig of filelist) {
      const {
        filePath
      } = fileConfig

      const url = await manager.uploadAsset(fileConfig)

      if (url) {
        urls.push({
          url,
          filePath
        })
      }
    }

    core.setOutput('browser_download_urls', JSON.stringify(urls, null, 2))
  } catch (e: any) {
    core.setFailed(e.message)
  }
}

if (require.main === module) {
  run()
}