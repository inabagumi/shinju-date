terraform {
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "3.6.0"
    }

    vercel = {
      source  = "vercel/vercel"
      version = "1.2.0"
    }
  }

  required_version = "~> 1.7"
}
