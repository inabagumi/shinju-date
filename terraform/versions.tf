terraform {
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "3.6.1"
    }

    vercel = {
      source  = "vercel/vercel"
      version = "1.7.0"
    }
  }

  required_version = "~> 1.8"
}
