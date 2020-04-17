const { join } = require('path')
const fs = require('fs-extra')
const i18n = require('i18next')
const isIPFS = require('is-ipfs')
const { clipboard, app, shell } = require('electron')
const logger = require('./common/logger')
const { IS_MAC } = require('./common/consts')
const setupGlobalShortcut = require('./setup-global-shortcut')
const { selectDirectory } = require('./dialogs')
const dock = require('./dock')
const showPrompt = require('./prompt')
const { showDialog } = require('./dialogs')

const CONFIG_KEY = 'downloadHashShortcut'

const SHORTCUT = IS_MAC
  ? 'Command+Control+H'
  : 'CommandOrControl+Alt+D'

async function saveFile (dir, file) {
  const location = join(dir, file.path)
  await fs.outputFile(location, file.content)
}

async function getCID () {
  const text = clipboard.readText().trim()

  const { button, input } = await showPrompt({
    title: i18n.t('downloadCidContentDialog.title'),
    message: i18n.t('downloadCidContentDialog.message'),
    placeholder: isIPFS.cid(text) ? text : '',
    buttons: [
      i18n.t('downloadCidContentDialog.action'),
      i18n.t('cancel')
    ]
  })

  if (button !== 0) {
    return
  }

  return input
}

async function downloadHash (ctx) {
  const cid = await getCID()
  if (!cid) {
    return
  }

  const { getIpfsd } = ctx
  const ipfsd = await getIpfsd()

  if (!ipfsd) {
    return
  }

  let path
  try {
    path = await ipfsd.api.resolve(cid)
  } catch (_) {
    showDialog({
      title: i18n.t('cantResolveCidDialog.title'),
      message: i18n.t('cantResolveCidDialog.message', { path: cid }),
      buttons: [i18n.t('close')]
    })

    return
  }

  const dir = await dock.run(() => selectDirectory({
    defaultPath: app.getPath('downloads')
  }))

  if (!dir) {
    logger.info(`[hash download] dropping ${path}: user didn't choose a path.`)
    return
  }

  let files

  try {
    logger.info(`[hash download] downloading ${path}: started`, { withAnalytics: 'DOWNLOAD_HASH' })
    files = await ipfsd.api.get(path)
    logger.info(`[hash download] downloading ${path}: completed`)
  } catch (err) {
    logger.error(`[hash download] ${err.stack}`)

    showDialog({
      title: i18n.t('couldNotGetCidDialog.title'),
      message: i18n.t('couldNotGetCidDialog.message', { path }),
      buttons: [i18n.t('close')]
    })

    return
  }

  try {
    await Promise.all(
      files
        .filter(file => !!file.content)
        .map(file => saveFile(dir, file))
    )

    const opt = showDialog({
      title: i18n.t('contentsSavedDialog.title'),
      message: i18n.t('contentsSavedDialog.message', { path }),
      buttons: [
        i18n.t('contentsSavedDialog.action'),
        i18n.t('close')
      ]
    })

    if (opt === 0) {
      shell.showItemInFolder(join(dir, files[0].path))
    }
  } catch (err) {
    logger.error(`[hash download] ${err.toString()}`)

    showDialog({
      title: i18n.t('couldNotSaveDialog.title'),
      message: i18n.t('couldNotSaveDialog.message'),
      buttons: [i18n.t('close')]
    })
  }
}

module.exports = function (ctx) {
  setupGlobalShortcut(ctx, {
    settingsOption: CONFIG_KEY,
    accelerator: SHORTCUT,
    action: () => {
      downloadHash(ctx)
    }
  })
}

module.exports.downloadHash = downloadHash
module.exports.SHORTCUT = SHORTCUT
