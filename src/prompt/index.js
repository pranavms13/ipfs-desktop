const { BrowserWindow, ipcMain } = require('electron')
const crypto = require('crypto')
const { IS_MAC } = require('../common/consts')

const getId = () => crypto.randomBytes(16).toString('hex')

const isInverse = IS_MAC

function generatePage ({ message, defaultValue = '', placeholder = 'Type here...', buttons }, id) {
  buttons = buttons.map((txt, i) => `<button ${i === 0 ? 'class="default"' : ''} id="${i}">${txt}</button>`)

  if (isInverse) {
    buttons.reverse()
  }

  const page = `<!DOCTYPE html>
<html>
  <body>
    <p>${message}</p>
    <input type="text" value="${defaultValue}" placeholder="${placeholder}" />
    <div id="buttons">${buttons.join('\n')}</div>
  </body>
  <style>
  :root {
    --bg-color: #f7f7f7;
    --color: #222222;
    --btn-bg: #ffffff;
    --btn-color: #222222;
    --btn-bg-hover: #fdfdfd;
    --btn-default-bg: #1e90ff;
    --btn-default-bg-hover: #0a85ff;
    --input-bg: #fff;
    --input-color: #222;
  }
  * {
    box-sizing: border-box;
  }
  body, html {
    margin: 0;
    padding: 0;
    font-size: 14px;
  }
  body {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    font-family: system-ui;
    line-height: 1;
    padding: 0.75rem;
    color: var(--color);
    background: var(--bg-color);
  }
  p, input, button {
    font-size: 1rem;
  }
  p {
    margin: 0;
  }
  input, button {
    border-radius: 0.2rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }
  input {
    background: var(--input-bg);
    color: var(--input-color);
    display: block;
    width: 100%;
    margin: 0.5rem 0;
    padding: 0.15rem;
    outline: 0;
  }
  #buttons {
    text-align: right;
  }
  button {
    background: var(--btn-bg);
    color: var(--btn-color);
    margin-left: 0.5rem;
    padding: 0.25rem 0.5rem;
    font-size: 1rem;
    outline: 0;
    cursor: pointer;
  }
  button:active,
  button:hover {
    background: var(--btn-bg-hover);
  }
  button.default {
    background: var(--btn-default-bg);
  }
  button.default:hover,
  button.default:active {
    background: var(--btn-default-bg-hover);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg-color: #333333;
      --color: #ffffff;
      --btn-bg: #4c4c4c;
      --btn-color: #ffffff;
      --btn-bg-hover: #404040;
      --input-bg: #4c4c4c;
      --input-color: #ffffff;
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

    document.querySelector('input').addEventListener('keypress', (event) => {
      if (event.keyCode == 13) {
        event.preventDefault()
        document.querySelector('button.default').click()
      }
    })
  </script>
</html>`

  return `data:text/html;base64,${Buffer.from(page, 'utf8').toString('base64')}`
}

module.exports = async function showPrompt (options = {}) {
  options.window = options.window || {}

  const window = new BrowserWindow({
    title: options.title,
    show: false,
    width: 350,
    height: 330,
    // resizable: false,
    webPreferences: {
      nodeIntegration: true
    },
    ...options.window
  })

  const id = getId()

  return new Promise(resolve => {
    ipcMain.once(id, (_, data) => {
      window.destroy()
      resolve(data)
    })

    window.on('close', () => {
      resolve({ input: '', button: null })
    })

    window.once('ready-to-show', () => {
      window.show()
    })

    window.loadURL(generatePage(options, id))
  })
}
