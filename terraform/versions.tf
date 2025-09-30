terraform {
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "3.7.2"
    }

    vercel = {
      source  = "vercel/vercel"
      version = "3.15.3"
    }
  }

  required_version = "~> 1.13"
}
