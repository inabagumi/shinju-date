terraform {
  cloud {
    organization = "inabagumi"

    workspaces {
      name = "shinju-date"
    }
  }
}

provider "vercel" {
  api_token = var.vercel_api_token
}
