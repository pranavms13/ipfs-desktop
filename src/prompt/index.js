const { BrowserWindow, ipcMain } = require('electron')
const crypto = require('crypto')
const { IS_MAC } = require('../common/consts')

const getId = () => crypto.randomBytes(16).toString('hex')

const isInverse = IS_MAC

function generatePage ({ title, message, placeholder = '', buttons }, id) {
  buttons = buttons.map((txt, i) => `<button id="${i}">${txt}</button>`)

  if (isInverse) {
    buttons.reverse()
  }

  const page = `<!DOCTYPE html>
<html>
  <body>
    <p style="margin: 0">${message}</p>
    <input type="text" value="${placeholder}" />
    <div id="buttons">${buttons.join('\n')}</div>
  </body>
  <style>
  * {
    box-sizing: border-box;
  }
  body, html {
    margin: 0;
    padding: 0;
  }
  body {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    font-family: -apple-system,BlinkMacSystemFont,
      avenir next,
      avenir,
      helvetica,
      helvetica neue,
      ubuntu,
      roboto,
      noto,
      segoe ui,
      arial,sans-serif;
    padding: 1rem;
    color: #000000;
    background: #f7f7f7;
  }
  input {
    display: block;
    width: 100%;
    border: 1px solid rgba(0, 0, 0, 0.05);
    margin: 1rem 0;
    padding: 0.25rem;
    outline: 0;
  }
  #buttons {
    text-align: right;
  }
  button {
    border: 1px solid rgba(0, 0, 0, 0.25);
    border-radius: 0.2rem;
    background: #222222;
    color: white;
    margin-left: 0.5rem;
    padding: 0.25rem 0.5rem;
  }
  button:last-of-type {
    background: #0b3a53;
  }
  @media (prefers-color-scheme: dark) {
    body {
      background: #333333;
      color: #ffffff;
    }
  }
  </style>
  <script>
    const { ipcRenderer } = require('electron')

    for (const button of document.querySelectorAll('button')) {
      button.addEventListener('click', event => {
        ipcRenderer.send('${id}', {
          input: document.querySelector('input').value,
          button: Number(button.id)
        })
      })
    }
  </script>
</html>`

  return `data:text/html;base64,${Buffer.from(page, 'utf8').toString('base64')}`
}

module.exports = async function showPrompt (options) {
  const window = new BrowserWindow({
    title: options.title,
    show: false,
    width: 350,
    height: 200,
    webPreferences: {
      nodeIntegration: true
    }
  })

  const id = getId()

  return new Promise(resolve => {
    ipcMain.once(id, (_, data) => {
      window.close()
      resolve(data)
    })

    window.on('closed', () => {
      resolve({ input: '', button: null })
    })

    window.once('ready-to-show', () => {
      window.show()
    })

    window.loadURL(generatePage(options, id))
  })
}
