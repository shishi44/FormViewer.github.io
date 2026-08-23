obs = obslua

source_name = "お便りフォーマット"
hotkey_prev_id = obs.OBS_INVALID_HOTKEY_ID
hotkey_next_id = obs.OBS_INVALID_HOTKEY_ID

function script_description()
  return [[
お便りフォーマット Browser Source に「前のお便り / 次のお便り」のキー入力を送ります。

1. OBSにお便りフォーマットのブラウザソースを追加します。
2. このスクリプトの「Browser Source名」をOBSのソース名と同じにします。
3. OBS 設定 → ホットキー で「お便りフォーマット: 前のお便り」「お便りフォーマット: 次のお便り」に好きなキーを割り当てます。
  ]]
end

function send_key(key_name)
  local source = obs.obs_get_source_by_name(source_name)
  if source == nil then
    obs.script_log(obs.LOG_WARNING, "お便りフォーマット: Browser Source が見つかりません: " .. source_name)
    return
  end

  local event = obs.obs_key_event()
  event.native_vkey = obs.obs_key_to_virtual_key(obs.obs_key_from_name(key_name))
  event.modifiers = 0
  event.native_modifiers = 0
  event.native_scancode = 0
  event.text = ""

  obs.obs_source_send_focus(source, true)
  obs.obs_source_send_key_click(source, event, false)
  obs.obs_source_send_key_click(source, event, true)
  obs.obs_source_release(source)
end

function previous_hotkey(pressed)
  if pressed then send_key("OBS_KEY_LEFT") end
end

function next_hotkey(pressed)
  if pressed then send_key("OBS_KEY_RIGHT") end
end

function script_properties()
  local props = obs.obs_properties_create()
  obs.obs_properties_add_text(props, "source_name", "Browser Source名", obs.OBS_TEXT_DEFAULT)
  return props
end

function script_defaults(settings)
  obs.obs_data_set_default_string(settings, "source_name", "お便りフォーマット")
end

function script_update(settings)
  source_name = obs.obs_data_get_string(settings, "source_name")
end

function script_load(settings)
  hotkey_prev_id = obs.obs_hotkey_register_frontend("formviewer_previous", "お便りフォーマット: 前のお便り", previous_hotkey)
  hotkey_next_id = obs.obs_hotkey_register_frontend("formviewer_next", "お便りフォーマット: 次のお便り", next_hotkey)

  local prev_array = obs.obs_data_get_array(settings, "formviewer_previous")
  obs.obs_hotkey_load(hotkey_prev_id, prev_array)
  obs.obs_data_array_release(prev_array)

  local next_array = obs.obs_data_get_array(settings, "formviewer_next")
  obs.obs_hotkey_load(hotkey_next_id, next_array)
  obs.obs_data_array_release(next_array)
end

function script_save(settings)
  local prev_array = obs.obs_hotkey_save(hotkey_prev_id)
  obs.obs_data_set_array(settings, "formviewer_previous", prev_array)
  obs.obs_data_array_release(prev_array)

  local next_array = obs.obs_hotkey_save(hotkey_next_id)
  obs.obs_data_set_array(settings, "formviewer_next", next_array)
  obs.obs_data_array_release(next_array)
end