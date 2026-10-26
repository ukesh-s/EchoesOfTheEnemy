class_name HUD
extends CanvasLayer

@onready var health_bar: ProgressBar = $MarginContainer/VBoxContainer/HealthBar
@onready var health_label: Label = $MarginContainer/VBoxContainer/HealthBar/HealthLabel
@onready var timer_label: Label = $MarginContainer/VBoxContainer/TimerLabel
@onready var debug_panel: PanelContainer = $DebugPanel
@onready var state_list_label: Label = $DebugPanel/VBoxContainer/StateListLabel
@onready var log_label: RichTextLabel = $DebugPanel/VBoxContainer/TransitionLogLabel
@onready var game_over_panel: Panel = $GameOverPanel
@onready var final_time_label: Label = $GameOverPanel/VBoxContainer/FinalTimeLabel
@onready var restart_button: Button = $GameOverPanel/VBoxContainer/RestartButton

var transition_history: Array[String] = []
const MAX_LOG_LINES: int = 6

func _ready() -> void:
	game_over_panel.visible = false
	if restart_button:
		restart_button.pressed.connect(_on_restart_pressed)

func update_health(current: int, maximum: int) -> void:
	if health_bar:
		health_bar.max_value = maximum
		health_bar.value = current
	if health_label:
		health_label.text = "HP: %d / %d" % [current, maximum]

func update_timer(seconds: float) -> void:
	if timer_label:
		var mins := int(seconds) / 60
		var secs := int(seconds) % 60
		var ms := int((seconds - int(seconds)) * 100)
		timer_label.text = "SURVIVAL TIME: %02d:%02d.%02d" % [mins, secs, ms]

func record_transition(enemy_name: String, old_state: String, new_state: String, reason: String) -> void:
	var entry := "[color=#88aacc]• %s:[/color] [b]%s[/b] → [color=#ffbb33][b]%s[/b][/color] (%s)" % [enemy_name, old_state, new_state, reason]
	transition_history.append(entry)
	if transition_history.size() > MAX_LOG_LINES:
		transition_history.pop_front()
	if log_label:
		log_label.text = "\n".join(transition_history)

func show_game_over(final_seconds: float) -> void:
	game_over_panel.visible = true
	var mins := int(final_seconds) / 60
	var secs := int(final_seconds) % 60
	var ms := int((final_seconds - int(final_seconds)) * 100)
	if final_time_label:
		final_time_label.text = "You survived for: %02d:%02d.%02d" % [mins, secs, ms]

func _on_restart_pressed() -> void:
	get_tree().reload_current_scene()
