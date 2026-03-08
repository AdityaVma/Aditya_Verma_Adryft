/* eslint-disable @typescript-eslint/no-var-requires */
const AWS = require('aws-sdk')
const https = require('https')
const { URL } = require('url')

const secrets = new AWS.SecretsManager()

async function sendResponse(
  responseUrl: string,
  event: Record<string, unknown>,
  status: string,
  reason?: string,
  physicalId?: string
) {
  const body = JSON.stringify({
    Status: status,
    Reason: reason || 'See CloudWatch Logs',
    PhysicalResourceId: physicalId || event.PhysicalResourceId || 'DbSecretUpdate',
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: {},
  })
  const url = new URL(responseUrl)
  return new Promise<void>((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'PUT',
        headers: { 'Content-Type': '', 'Content-Length': Buffer.byteLength(body) },
      },
      () => resolve()
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

export async function handler(event: Record<string, unknown>) {
  const reqType = event.RequestType as string
  const props = (event.ResourceProperties || {}) as {
    SecretArn: string
    Endpoint: string
    DbName: string
  }
  const { SecretArn, Endpoint, DbName } = props
  const responseUrl = event.ResponseURL as string

  try {
    if (reqType === 'Delete') {
      await sendResponse(responseUrl, event, 'SUCCESS')
      return
    }

    const getResp = await secrets.getSecretValue({ SecretId: SecretArn }).promise()
    const raw = getResp.SecretString
    if (!raw) throw new Error('Empty secret')
    const parsed = JSON.parse(raw) as Record<string, string>
    const username = parsed.username || 'studycollab'
    const password = parsed.password
    if (!password) throw new Error('No password in secret')
    const encodedPass = encodeURIComponent(password)
    const connectionString = `postgresql://${username}:${encodedPass}@${Endpoint}:5432/${DbName}`

    await secrets
      .putSecretValue({
        SecretId: SecretArn,
        SecretString: JSON.stringify({ ...parsed, connectionString }),
      })
      .promise()

    await sendResponse(responseUrl, event, 'SUCCESS')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await sendResponse(responseUrl, event, 'FAILED', message)
  }
}
