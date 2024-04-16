terraform {
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "3.6.1"
    }

    vercel = {
      source  = "vercel/vercel"
      version = "1.5.1"
    }
  }

  required_version = "~> 1.8"
}
