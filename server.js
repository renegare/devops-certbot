const Nodemailer = require('nodemailer')
const exec = require('child_process').exec
const app = require('koa')()
const stat = require('koa-static')
const Promise = require('bluebird')
const delay = Promise.delay
const glob = require('glob')
const AdmZip = require('adm-zip')

const info = require('debug')('app:info')
const debug = require('debug')('app:debug')
const error = require('debug')('app:error')

app.use(stat('.', {hidden: true}))
app.listen(3000)

const config = {
  email: process.env.SMTP_EMAIL,
  password: process.env.SMTP_PASS,
  host: process.env.SMTP_HOST,
  domains: process.env.DOMAINS.split(','),
  dryRun: process.env.DRY_RUN === 'true',
  staging: process.env.STAGING === 'true'
}
debug('config:', config)


const defer = (new Promise((resolve, reject) => {
  const certbot = exec(`certbot certonly${config.dryRun? ' --dry-run' : ''}${config.staging? ' --staging' : ''} \
    --webroot \
    --webroot-path /app \
    --agree-tos \
    -m ${config.email} \
    ${config.domains.map(d => '-d ' + d).join(' ')}`, {encoding: 'utf8'}, (err, stdout, stderr) => {
      if (err) error(err.message)
      if (stderr) error(stderr)
      if (stdout) info(stdout)
    })

  certbot.on('exit', (code) => {
    info('cerbot completed with exit code', code)
    if (code === 0) {
      resolve()
    } else {
      process.exit(code)
    }
  })
})).then(() => {
    const files = glob.sync('**/*', {
      cwd: '/etc/letsencrypt',
      dot: true,
      nodir: true
    })
    const zip = new AdmZip()
    files.forEach(file => zip.addLocalFile('/etc/letsencrypt/' + file, file))
    return zip.toBuffer()
  })
  .then(zip => {
    const smtpURL = `smtps://${encodeURIComponent(config.email)}:${config.password}@${config.host}`
    const transporter = Nodemailer.createTransport(smtpURL)
    const options = {
      from: config.email,
      to: config.email,
      subject: 'LetsEncrypt DV Certificates',
      text: 'Please see attached your newly generated DV certificates.',
      attachments: [{
        filename: 'certs.zip',
        content: zip
      }]
    }

    debug(`sending certs to: ${config.email}`)
    return transporter.sendMail(options)
  })
  .then(() => {
    info(`certs should have been generated and sent over to you :)`)
  })
  .catch(err => delay(1000).then(() => {
    error(err)
  }))
