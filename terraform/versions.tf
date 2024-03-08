terraform {
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "3.6.0"
    }

    vercel = {
      source  = "vercel/vercel"
      version = "1.2.1"
    }
  }

  required_version = "~> 1.7"
}
