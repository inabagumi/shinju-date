# 手で追加されていた環境変数を取り込む。apply が済んだら、このファイルを消す

locals {
  # プロジェクト => Vercel の環境変数の名前 => project.tf のキー
  imported_environment_variables = {
    admin = {
      GOOGLE_API_KEY       = "google_api_key"
      TWITCH_CLIENT_ID     = "twitch_client_id"
      TWITCH_CLIENT_SECRET = "twitch_client_secret"
    }
    batch = {
      TWITCH_CLIENT_ID     = "twitch_client_id"
      TWITCH_CLIENT_SECRET = "twitch_client_secret"
    }
  }

  # environment は値を含むので全体が sensitive になるが、ID と名前は秘密ではない
  environment_variable_imports = merge([
    for project, names in local.imported_environment_variables : {
      for environment_variable in nonsensitive([
        for environment_variable in data.vercel_project.imported[project].environment : {
          id  = environment_variable.id
          key = environment_variable.key
        }
        # 同じ名前でも、定義と対象が重ならないもの（development 用など）は取り込まない
        if length(setintersection(
          environment_variable.target == null ? [] : environment_variable.target,
          try(local.projects[project].environment_variables[names[environment_variable.key]].target, []),
        )) > 0
      ]) :
      "${project}/${names[environment_variable.key]}" => {
        id = join("/", [
          var.vercel_team_id,
          data.vercel_project.imported[project].id,
          environment_variable.id,
        ])
        name    = names[environment_variable.key]
        project = project
      }
    }
  ]...)
}

data "vercel_project" "imported" {
  for_each = local.imported_environment_variables

  name    = local.projects[each.key].name
  team_id = var.vercel_team_id
}

import {
  for_each = local.environment_variable_imports

  id = each.value.id
  to = module.project[each.value.project].vercel_project_environment_variable.this[each.value.name]
}
