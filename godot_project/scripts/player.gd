class_name Player
extends CharacterBody2D

signal health_changed(current_health: int, max_health: int)
signal player_damaged(damage_taken: int)
signal player_died

@export var speed: float = 220.0
@export var max_health: int = 100
@export var damage_invulnerability_time: float = 0.4

var health: int
var can_take_damage: bool = true
var invulnerability_timer: float = 0.0
var is_dead: bool = false

@onready var sprite: Sprite2D = $Sprite2D
@onready var collision_shape: CollisionShape2D = $CollisionShape2D

func _ready() -> void:
	add_to_group("player")
	health = max_health
	emit_signal("health_changed", health, max_health)

func _physics_process(delta: float) -> void:
	if is_dead:
		velocity = Vector2.ZERO
		move_and_slide()
		return
		
	# Update damage invulnerability timer
	if not can_take_damage:
		invulnerability_timer -= delta
		# Flash effect while invulnerable
		if sprite:
			sprite.modulate.a = 0.5 + 0.5 * sin(invulnerability_timer * 25.0)
		if invulnerability_timer <= 0.0:
			can_take_damage = true
			if sprite:
				sprite.modulate.a = 1.0

	# Normalized 8-way movement
	var direction := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	velocity = direction * speed
	
	# Rotate player slightly toward movement direction if moving
	if direction.length_squared() > 0.01 and sprite:
		rotation = lerp_angle(rotation, direction.angle() + PI / 2.0, 15.0 * delta)
		
	move_and_slide()

func take_damage(amount: int) -> void:
	if not can_take_damage or is_dead:
		return
		
	health = max(health - amount, 0)
	can_take_damage = false
	invulnerability_timer = damage_invulnerability_time
	
	emit_signal("player_damaged", amount)
	emit_signal("health_changed", health, max_health)
	
	if health <= 0:
		die()

func die() -> void:
	if is_dead:
		return
	is_dead = true
	velocity = Vector2.ZERO
	if sprite:
		sprite.modulate = Color(0.4, 0.4, 0.4, 0.7)
	emit_signal("player_died")

func heal(amount: int) -> void:
	if is_dead:
		return
	health = min(health + amount, max_health)
	emit_signal("health_changed", health, max_health)
