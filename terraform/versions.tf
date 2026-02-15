terraform {
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "3.8.1"
    }

    vercel = {
      source  = "vercel/vercel"
      version = "4.2.0"
    }
  }

  required_version = "~> 1.14"
}
