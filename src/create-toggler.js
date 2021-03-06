const { ipcMain } = require('electron')
const os = require('os')
const store = require('./common/store')
const logger = require('./common/logger')

module.exports = function ({ webui }, settingsOption, activate) {
  ipcMain.on('config.toggle', async (_, opt) => {
    if (opt !== settingsOption) {
      return
    }

    const oldValue = store.get(settingsOption, null)
    const newValue = !oldValue
    let success = false

    if (await activate(newValue, oldValue)) {
      store.set(settingsOption, newValue)
      success = true

      const action = newValue ? 'enabled' : 'disabled'
      logger.info(`[${settingsOption}] ${action}`)
    }

    webui.webContents.send('config.changed', {
      config: store.store,
      changed: settingsOption,
      platform: os.platform(),
      success
    })
  })
}
