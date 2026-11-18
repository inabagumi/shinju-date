variable "environment_variables" {
  type = map(object({
    key       = string
    sensitive = optional(bool, false)
    target    = list(string)
    value     = string
  }))
}

variable "function_default_cpu_type" {
  type = string
}

variable "function_default_timeout" {
  type = number
}

variable "name" {
  type = string
}

variable "root_directory" {
  type = string
}

variable "team_id" {
  type = string
}
