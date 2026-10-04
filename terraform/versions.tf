terraform {
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "3.9.1"
    }

    vercel = {
      source  = "vercel/vercel"
      version = "5.19.0"
    }
  }

  required_version = "~> 1.16"
}
