terraform {
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "3.9.0"
    }

    vercel = {
      source  = "vercel/vercel"
      version = "5.7.1"
    }
  }

  required_version = "~> 1.15"
}
