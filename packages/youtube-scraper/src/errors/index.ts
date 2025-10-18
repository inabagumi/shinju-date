export class YouTubeScraperError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'YouTubeScraperError'
  }
}

export class APIKeyError extends YouTubeScraperError {
  constructor(message = 'YouTube API key is required') {
    super(message)
    this.name = 'APIKeyError'
  }
}

export class ChannelNotFoundError extends YouTubeScraperError {
  constructor(channelID: string) {
    super(`Channel not found: ${channelID}`)
    this.name = 'ChannelNotFoundError'
  }
}

export class VideoNotFoundError extends YouTubeScraperError {
  constructor(videoID: string) {
    super(`Video not found: ${videoID}`)
    this.name = 'VideoNotFoundError'
  }
}
