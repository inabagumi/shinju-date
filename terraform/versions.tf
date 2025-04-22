terraform {
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "3.7.2"
    }

    vercel = {
      source  = "vercel/vercel"
      version = "2.15.1"
    }
  }

  required_version = "~> 1.11"
}
