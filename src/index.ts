import * as core from '@actions/core'

import {
  UploadManager
} from './upload-manager'

import { githubToken } from './config'

async function run() {
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



    await manager.resolveTag()

    for (let fileConfig of filelist) {
      await manager.uploadAsset(fileConfig)

    }

  } catch (e: any) {
    core.setFailed(e.message)
  }
}

if (require.main === module) {
  run()
}