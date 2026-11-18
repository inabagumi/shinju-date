# Vercel の画面から手で追加されていた環境変数を、作り直さずに取り込む。
# apply が済んだら、このファイルを消す。
#
# 取り込みには環境変数の ID が要るので、plan のときに Vercel から読み、名前で探す。
# 同じ名前の環境変数が Vercel になければ、取り込まずに新しく作る。

locals {
  # 取り込む環境変数（プロジェクト => Vercel の環境変数の名前 => project.tf のキー）
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

  # 取り込む環境変数ごとの、取り込みの ID と取り込み先。
  # environment は値を含むので全体が sensitive になるが、ID と名前は秘密ではない
  environment_variable_imports = merge([
    for project, names in local.imported_environment_variables : {
      for environment_variable in nonsensitive([
        for environment_variable in data.vercel_project.imported[project].environment : {
          id  = environment_variable.id
          key = environment_variable.key
        }
      ]) :
      "${project}/${names[environment_variable.key]}" => {
        # チーム/プロジェクト/環境変数
        id = join("/", [
          var.vercel_team_id,
          data.vercel_project.imported[project].id,
          environment_variable.id,
        ])
        name    = names[environment_variable.key]
        project = project
      }
      if contains(keys(names), environment_variable.key)
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
