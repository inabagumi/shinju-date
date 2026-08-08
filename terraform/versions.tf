terraform {
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "3.9.0"
    }

    vercel = {
      source  = "vercel/vercel"
      version = "5.10.0"
    }
  }

  required_version = "~> 1.15"
}
