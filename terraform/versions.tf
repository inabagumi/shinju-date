terraform {
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "3.6.1"
    }

    vercel = {
      source  = "vercel/vercel"
      version = "1.9.2"
    }
  }

  required_version = "~> 1.8"
}
